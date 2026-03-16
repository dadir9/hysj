using Hysj.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Hysj.Api.Data;

public class HysjDbContext(DbContextOptions<HysjDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Device> Devices => Set<Device>();
    public DbSet<PreKey> PreKeys => Set<PreKey>();
    public DbSet<LoginAttempt> LoginAttempts => Set<LoginAttempt>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Username).IsUnique();
            e.Property(u => u.Username).HasMaxLength(50).IsRequired();
            e.Property(u => u.PasswordHash).IsRequired();
        });

        modelBuilder.Entity<Device>(e =>
        {
            e.HasKey(d => d.Id);
            e.HasOne(d => d.User)
             .WithMany(u => u.Devices)
             .HasForeignKey(d => d.UserId)
             .OnDelete(DeleteBehavior.Cascade);
            e.Property(d => d.DeviceName).HasMaxLength(100).IsRequired();
        });

        modelBuilder.Entity<PreKey>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.Id).UseIdentityColumn();
            e.HasOne(p => p.Device)
             .WithMany(d => d.PreKeys)
             .HasForeignKey(p => p.DeviceId)
             .OnDelete(DeleteBehavior.Cascade);
            e.Property(p => p.IsUsed).HasDefaultValue(false);
        });

        modelBuilder.Entity<LoginAttempt>(e =>
        {
            e.HasKey(l => l.Id);
            e.Property(l => l.Id).UseIdentityColumn();
            e.Property(l => l.IpAddress).HasMaxLength(45).IsRequired();
            e.Property(l => l.Username).HasMaxLength(50).IsRequired();
            e.HasIndex(l => new { l.IpAddress, l.Timestamp });
        });
    }
}
